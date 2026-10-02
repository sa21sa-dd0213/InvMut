import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - empty _tos array", function () {
  it("should revert when _tos array is empty (original behavior) but mutant does not revert", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a token contract to serve as the caddress parameter
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Mock", "MCK", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Setup: approve the EBU contract to transfer tokens from owner
    await token.approve(await instance.getAddress(), ethers.parseEther("100"));
    
    // Call transfer with empty _tos array - should revert in original
    await expect(
      instance.transfer(
        owner.address,
        await token.getAddress(),
        [],
        []
      )
    ).to.be.reverted;
  });
});