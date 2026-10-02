import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant m881bfa03 test", function () {
  it("should revert when unauthorized address tries to upgrade via upgradeToAndCall", async function () {
    const [owner, unauthorized] = await ethers.getSigners();
    
    // Deploy VaultAdapter (constructor takes no arguments, but has _disableInitializers())
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a mock access control contract that implements IAccessControl
    const AccessControlFactory = await ethers.getContractFactory("MockAccessControl");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();
    
    // Initialize VaultAdapter with access control
    await instance.connect(owner).initialize(await accessControl.getAddress());
    
    // Deploy a new implementation contract (any contract that has proxiableUUID())
    const NewImplFactory = await ethers.getContractFactory("VaultAdapter");
    const newImplementation = await NewImplFactory.deploy();
    await newImplementation.waitForDeployment();
    
    // Try to upgrade from unauthorized address - should revert with AccessDenied
    await expect(
      instance.connect(unauthorized).upgradeToAndCall(
        await newImplementation.getAddress(),
        "0x"
      )
    ).to.be.reverted;
  });
});