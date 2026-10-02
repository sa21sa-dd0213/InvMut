import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant md8e8d016 test", function () {
  it("should detect mutant that adds 1 wei to msg.value when recording balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    const sendAmount = ethers.parseEther("1");
    const tx = await instance.connect(addr1).Put(0, { value: sendAmount });
    await tx.wait();

    const holder = await instance.Acc(addr1.address);
    // On the original contract, balance should equal sendAmount
    // On the mutant, balance will be sendAmount + 1 wei
    expect(holder.balance).to.equal(sendAmount);
  });
});