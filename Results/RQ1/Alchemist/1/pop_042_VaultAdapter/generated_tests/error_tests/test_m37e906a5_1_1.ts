import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant detection - m37e906a5", function () {
    it("should detect division-to-addition mutant in _applySlopes when utilization is below kink", async function () {
        const [owner, addr1] = await ethers.getSigners();
        
        // Deploy VaultAdapter (no constructor arguments as per the contract)
        const VaultAdapterFactory = await ethers.getContractFactory("VaultAdapter");
        const vaultAdapter = await VaultAdapterFactory.deploy();
        await vaultAdapter.waitForDeployment();

        // Deploy a mock vault contract for testing
        const MockVaultFactory = await ethers.getContractFactory("MockVault");
        const mockVault = await MockVaultFactory.deploy();
        await mockVault.waitForDeployment();

        // Initialize the vault adapter
        await vaultAdapter.initialize(owner.address);

        // Set slopes with a kink value (must be > 0 and < 1e27)
        const validKink = ethers.parseEther("0.8"); // 0.8 * 10^18
        const slope0 = ethers.parseEther("0.1");
        const slope1 = ethers.parseEther("0.2");

        await vaultAdapter.setSlopes(mockVault.target, {
            kink: validKink,
            slope0: slope0,
            slope1: slope1
        });

        // Set limits
        const maxMultiplier = ethers.parseEther("2");
        const minMultiplier = ethers.parseEther("0.5");
        const rate = ethers.parseEther("0.1");
        await vaultAdapter.setLimits(maxMultiplier, minMultiplier, rate);

        // Setup mock vault to return a utilization BELOW kink (e.g., 0.5 * 10^18 which is < 0.8 * 10^18)
        const lowUtilization = ethers.parseEther("0.5"); // 50% utilization
        const mockIndex = ethers.parseEther("1");

        // Configure mock vault behavior
        await mockVault.setUtilization(lowUtilization);
        await mockVault.setCurrentUtilizationIndex(mockIndex);

        // Call rate() - this will execute _applySlopes with utilization < kink
        // The original code calculates: interestRate = (slope0 * utilization / kink) * multiplier / 1e27
        // The mutant changes the last division to addition: interestRate = (slope0 * utilization / kink) * multiplier + 1e27

        // For the original: (0.1e18 * 0.5e18 / 0.8e18) * 1e18 / 1e27 ≈ (0.0625e18) * 1e18 / 1e27 = 0.0625e9
        // For the mutant: (0.1e18 * 0.5e18 / 0.8e18) * 1e18 + 1e27 ≈ 0.0625e18 * 1e18 + 1e27 = 0.0625e36 + 1e27

        // The mutant result will be astronomically larger (around 1e27 larger)
        // So we can detect it by asserting the result is less than 1e27

        const result = await vaultAdapter.rate(mockVault.target, owner.address);

        // Original code would return a value much less than 1e27 (around 0.0625e9)
        // Mutant would return a value >= 1e27
        expect(result).to.be.lessThan(ethers.parseEther("1")); // Should be well under 1e18 if original code is correct

        // Additional verification - the result should be a reasonable interest rate
        expect(result).to.be.greaterThan(0);
    });
});