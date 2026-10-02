import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should return true when transfer is successful (kills mutant that removes return true)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like token to use as caddress
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Approve the airPort contract to transfer tokens from owner
    await token.approve(await instance.getAddress(), ethers.parseEther("100"));

    // Call transfer with valid parameters
    const recipients = [addr1.address, addr2.address];
    const tx = await instance.transfer(owner.address, await token.getAddress(), recipients, ethers.parseEther("10"));
    await tx.wait();

    // The original returns true, the mutant returns nothing - we expect true
    expect(await instance.transfer.staticCall(owner.address, await token.getAddress(), recipients, ethers.parseEther("10"))).to.equal(true);
  });
});