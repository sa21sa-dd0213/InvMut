import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m4e3eb728 - delegateVoting authorization", function () {
  it("should revert when non-owner calls delegateVoting", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the Cooler contract (no constructor args needed for Cooler itself)
    const CoolerFactory = await ethers.getContractFactory("Cooler");
    const cooler = await CoolerFactory.deploy();
    await cooler.waitForDeployment();

    // Deploy a mock ERC20 to use as collateral (needed for delegateVoting)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Mock", "MCK", 18);
    await mockToken.waitForDeployment();

    // Deploy the factory to create a proper cooler instance with immutable args
    const Factory = await ethers.getContractFactory("CoolerFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();

    // Generate a cooler through the factory (this sets up immutable args including owner)
    await factory.connect(addr1).generateCooler(await mockToken.getAddress(), await mockToken.getAddress());
    const coolerAddress = await factory.coolersFor(await mockToken.getAddress(), await mockToken.getAddress(), 0);
    const coolerInstance = await ethers.getContractAt("Cooler", coolerAddress);

    // Attempt to call delegateVoting from a non-owner address
    await expect(
      coolerInstance.connect(addr2).delegateVoting(addr2.address)
    ).to.be.revertedWithCustomError(coolerInstance, "OnlyApproved");
  });
});