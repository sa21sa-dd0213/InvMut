import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant test - empty _tos array", function () {
  it("should revert when _tos array is empty (original requires _tos.length > 0)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the airdrop contract (no constructor arguments)
    const AirdropFactory = await ethers.getContractFactory("airdrop");
    const airdrop = await AirdropFactory.deploy();
    await airdrop.waitForDeployment();

    // Create a mock token contract that implements transferFrom
    const MockTokenFactory = await ethers.getContractFactory("MockToken");
    const mockToken = await MockTokenFactory.deploy();
    await mockToken.waitForDeployment();

    // Fund owner with tokens and approve airdrop contract to spend them
    await mockToken.mint(owner.address, ethers.parseEther("100"));
    await mockToken.approve(await airdrop.getAddress(), ethers.parseEther("100"));

    // Call transfer with an empty _tos array - should revert in original, pass in mutant
    await expect(
      airdrop.transfer(
        owner.address,
        await mockToken.getAddress(),
        [],  // empty array
        ethers.parseEther("1")
      )
    ).to.be.reverted;
  });
});