import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant detection - m48f200ad", function () {
  it("should succeed when setSlopes is called with a valid kink value (e.g., 0.5e27)", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy VaultAdapter (constructor takes no arguments)
    const VaultAdapterFactory = await ethers.getContractFactory("VaultAdapter");
    const vaultAdapter = await VaultAdapterFactory.deploy();
    await vaultAdapter.waitForDeployment();
    
    // Deploy a mock access control contract for initialization
    const MockAccessControlFactory = await ethers.getContractFactory(
      "contracts/mocks/MockAccessControl.sol:MockAccessControl"
    );
    const mockAccessControl = await MockAccessControlFactory.deploy();
    await mockAccessControl.waitForDeployment();
    
    // Initialize VaultAdapter with the access control contract
    await vaultAdapter.initialize(await mockAccessControl.getAddress());
    
    // Grant access for the setSlopes function selector to the owner
    const setSlopesSelector = vaultAdapter.interface.getFunction("setSlopes").selector;
    await mockAccessControl.grantAccess(setSlopesSelector, await vaultAdapter.getAddress(), owner.address);
    
    // Define a valid slope data with kink = 0.5e27 (valid: > 0 and < 1e27)
    const validSlopes = {
      kink: ethers.parseEther("0.5"), // 0.5e27
      slope0: ethers.parseEther("0.1"),
      slope1: ethers.parseEther("0.05")
    };
    
    // This should succeed on the original contract but fail on the mutant
    // because the mutant reverts when kink != 0 (any non-zero value)
    const tx = vaultAdapter.setSlopes(
      "0x0000000000000000000000000000000000000001",
      validSlopes
    );
    
    // On the original contract, this transaction should succeed
    await expect(tx).to.not.be.reverted;
    
    // Verify the slopes were set correctly
    const storedSlopes = await vaultAdapter.getVaultAdapterStorage().slopeData(
      "0x0000000000000000000000000000000000000001"
    );
    expect(storedSlopes.kink).to.equal(validSlopes.kink);
    expect(storedSlopes.slope0).to.equal(validSlopes.slope0);
    expect(storedSlopes.slope1).to.equal(validSlopes.slope1);
  });
});