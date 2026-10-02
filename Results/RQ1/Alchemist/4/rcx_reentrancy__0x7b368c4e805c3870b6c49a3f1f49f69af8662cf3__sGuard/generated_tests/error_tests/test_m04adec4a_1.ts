import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant detection - m04adec4a", function () {
  it("should detect mutant that logs msg.value-1 instead of msg.value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy W_WALLET with Log address as constructor argument
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();
    
    // Send 2 ether to Put function via addr1
    const sendAmount = ethers.parseEther("2");
    const tx = await instance.connect(addr1).Put(0, { value: sendAmount });
    await tx.wait();
    
    // Get the last message from Log contract
    const historyLength = await log.History.length;
    const lastMessage = await log.History(historyLength - 1n);
    
    // Verify the logged value matches the actual amount sent
    expect(lastMessage.Val).to.equal(sendAmount);
  });
});