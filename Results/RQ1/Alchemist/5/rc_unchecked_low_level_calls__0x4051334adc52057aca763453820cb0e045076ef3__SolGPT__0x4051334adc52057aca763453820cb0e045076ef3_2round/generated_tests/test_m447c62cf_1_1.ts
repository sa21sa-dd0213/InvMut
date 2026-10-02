import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant m447c62cf test", function () {
  it("should revert when loop iterates beyond array bounds (i <= _tos.length)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airdrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a token contract that implements transferFrom
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Mint tokens to owner and approve airdrop contract to spend
    await token.mint(owner.address, ethers.parseEther("100"));
    await token.connect(owner).approve(await instance.getAddress(), ethers.parseEther("100"));

    // Prepare array with one recipient (valid case)
    const recipients = [addr1.address];
    const amount = ethers.parseEther("10");

    // The mutant changes i < _tos.length to i <= _tos.length
    // This will cause out-of-bounds access on _tos[1] when array has only 1 element
    // Original should succeed, mutant should revert
    await expect(
      instance.connect(owner).transfer(
        owner.address,
        await token.getAddress(),
        recipients,
        amount
      )
    ).to.be.reverted;
  });
});