import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant m447c62cf detection", function () {
  it("should detect the <= mutant by triggering out-of-bounds access", async function () {
    const [owner, from, addr1, addr2] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("airdrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a simple ERC20 mock to use as the token contract for transferFrom calls
    const ERC20Factory = await ethers.getContractFactory("contracts/mocks/ERC20Mock.sol:ERC20Mock");
    const token = await ERC20Factory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Fund the from account with tokens and approve the airdrop contract
    await token.transfer(from.address, ethers.parseEther("100"));
    await token.connect(from).approve(await instance.getAddress(), ethers.parseEther("100"));

    // Create an array with 1 recipient - this will cause the mutant to access index 1 (out of bounds)
    const recipients = [addr1.address];
    const amount = ethers.parseEther("10");

    // On the original contract, this should succeed (loop runs i=0 only)
    // On the mutant (i <= _tos.length), loop tries i=0 then i=1, causing revert on _tos[1]
    await expect(
      instance.connect(from).transfer(
        from.address,
        await token.getAddress(),
        recipients,
        amount
      )
    ).to.be.reverted;
  });
});