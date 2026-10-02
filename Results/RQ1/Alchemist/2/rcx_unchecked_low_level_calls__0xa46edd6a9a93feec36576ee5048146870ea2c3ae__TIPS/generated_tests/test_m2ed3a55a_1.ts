import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m2ed3a55a test", function () {
  it("should kill mutant by calling transfer with non-empty _tos array and expecting success", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare a simple token contract to use as caddress (needs transferFrom)
    const tokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await tokenFactory.deploy("Mock", "MCK", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Approve EBU contract to spend from owner
    await token.connect(owner).approve(await instance.getAddress(), ethers.parseEther("100"));

    // Call transfer with non-empty array - should succeed on original, revert on mutant
    const tos = [addr1.address];
    const values = [ethers.parseEther("10")];
    
    await expect(
      instance.connect(owner).transfer(owner.address, await token.getAddress(), tos, values)
    ).to.not.be.reverted;
  });
});