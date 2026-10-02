import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant md63b1ace test", function () {
  it("should revert when setting slopes with invalid kink values", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the VaultAdapter contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a mock access control contract for initialization
    const AccessControlFactory = await ethers.getContractFactory("AccessControlMock");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();
    
    // Initialize the VaultAdapter
    await instance.initialize(await accessControl.getAddress());
    
    // Grant access to the owner for the setSlopes function selector
    const setSlopesSelector = ethers.id("setSlopes(address,(uint256,uint256,uint256))").slice(0, 10);
    await accessControl.grantAccess(setSlopesSelector, await instance.getAddress(), owner.address);
    
    // Test case 1: kink = 0 should revert with InvalidKink
    const slopeDataWithZeroKink = {
      kink: 0,
      slope0: ethers.parseEther("0.1"),
      slope1: ethers.parseEther("0.2")
    };
    
    await expect(
      instance.connect(owner).setSlopes(owner.address, slopeDataWithZeroKink)
    ).to.be.revertedWithCustomError(instance, "InvalidKink");
    
    // Test case 2: kink >= 1e27 should revert with InvalidKink
    // Use a kink value >= 1e27
    const largeKink = ethers.parseUnits("1", 27); // This is 1e27
    const slopeDataWithExactLargeKink = {
      kink: largeKink,
      slope0: ethers.parseEther("0.1"),
      slope1: ethers.parseEther("0.2")
    };
    
    await expect(
      instance.connect(owner).setSlopes(owner.address, slopeDataWithExactLargeKink)
    ).to.be.revertedWithCustomError(instance, "InvalidKink");
  });
});