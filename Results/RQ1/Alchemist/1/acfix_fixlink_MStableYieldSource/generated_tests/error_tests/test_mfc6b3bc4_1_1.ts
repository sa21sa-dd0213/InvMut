import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant test - balanceOfToken multiplication vs addition", function () {
  it("should detect the mutant by verifying correct balance calculation using multiplication", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock savings contract that returns known exchange rate
    const MockSavingsFactory = await ethers.getContractFactory("MockSavingsContract");
    const mockSavings = await MockSavingsFactory.deploy();
    await mockSavings.waitForDeployment();

    // Deploy the MStableYieldSource with the mock savings contract
    const MStableYieldSourceFactory = await ethers.getContractFactory("MStableYieldSource");
    const yieldSource = await MStableYieldSourceFactory.deploy(await mockSavings.getAddress());
    await yieldSource.waitForDeployment();

    // Get the mAsset token address from the yield source
    const mAssetAddress = await yieldSource.depositToken();
    const mAsset = await ethers.getContractAt("IERC20", mAssetAddress);

    // Fund the test account with mAssets (mint or transfer)
    const supplyAmount = ethers.parseEther("100");

    // First, we need to mint mAsset tokens to addr1 for testing
    // Since we don't have a mint function, we'll use the mock savings to simulate deposits
    // Set up the mock to return a known exchange rate (1:1 for simplicity)
    await mockSavings.setExchangeRate(ethers.parseEther("1"));

    // Approve yield source to spend mAssets from owner
    await mAsset.approve(await yieldSource.getAddress(), supplyAmount);

    // Supply tokens to the yield source for addr1
    await yieldSource.supplyTokenTo(supplyAmount, addr1.address);

    // Now the imBalances[addr1] should be supplyAmount (since exchange rate is 1)
    // Original: (imBalances[addr] * exchangeRate) / 1e18 = (100 * 1e18) / 1e18 = 100
    // Mutant: (imBalances[addr] + exchangeRate) / 1e18 = (100 + 1e18) / 1e18 = 1 + very small = ~1

    // Call balanceOfToken for addr1
    const balance = await yieldSource.balanceOfToken(addr1.address);

    // With original code, balance should be supplyAmount (100 tokens)
    // With mutant code, balance would be approximately 1 (100 + 1e18)/1e18
    expect(balance).to.equal(supplyAmount);

    // Additional verification: test with different exchange rate
    const newExchangeRate = ethers.parseEther("2"); // 2x exchange rate
    await mockSavings.setExchangeRate(newExchangeRate);

    const balanceAfterRateChange = await yieldSource.balanceOfToken(addr1.address);

    // Original: (100 * 2e18) / 1e18 = 200
    // Mutant: (100 + 2e18) / 1e18 = 2 + very small = ~2
    expect(balanceAfterRateChange).to.equal(ethers.parseEther("200"));
  });
});