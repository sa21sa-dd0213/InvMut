import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should return true when transfer is successful, mutant returns false", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like token that implements transferFrom
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Give owner some tokens and approve the airPort contract to spend them
    await token.approve(await instance.getAddress(), ethers.parseEther("100"));
    
    // Fund addr1 with tokens to transfer from
    await token.transfer(addr1.address, ethers.parseEther("50"));
    
    // Have addr1 approve airPort to spend their tokens
    await token.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("10"));

    // Call transfer with valid parameters
    const recipients = [addr2.address];
    const tx = await instance.transfer(
      addr1.address,
      await token.getAddress(),
      recipients,
      ethers.parseEther("5")
    );
    const receipt = await tx.wait();
    
    // The return value should be true for the original, false for the mutant
    expect(await instance.transfer.staticCall(
      addr1.address,
      await token.getAddress(),
      recipients,
      ethers.parseEther("5")
    )).to.be.true;
  });
});