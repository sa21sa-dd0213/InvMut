import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant ma75cd1a0 - setMigrator access control", function () {
  it("should revert when non-owner calls setMigrator on original contract", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for the stakingToken constructor argument
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Test", "TST", ethers.parseEther("1000000"));
    await mockToken.waitForDeployment();
    
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await mockToken.getAddress(), owner.address);
    await instance.waitForDeployment();

    // Non-owner should not be able to set migrator
    await expect(
      instance.connect(addr1).setMigrator(addr1.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});