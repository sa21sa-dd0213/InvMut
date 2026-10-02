import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should return true when transfer is successful, killing mutant that removes return true", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy a mock ERC20 token that supports transferFrom
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Give addr1 some tokens and approve owner to spend them
    await token.transfer(addr1.address, ethers.parseEther("100"));
    await token.connect(addr1).approve(owner.address, ethers.parseEther("100"));

    // Deploy the airdrop contract
    const Factory = await ethers.getContractFactory("airdrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare recipients array
    const recipients = [addr2.address];
    const amount = ethers.parseEther("10");

    // Call transfer and check return value
    const tx = await instance.transfer(owner.address, token.target, recipients, amount);
    await tx.wait();

    // The return value from the function call
    const returnValue = await instance.transfer.staticCall(owner.address, token.target, recipients, amount);

    // Original returns true, mutant returns false
    expect(returnValue).to.be.true;
  });
});