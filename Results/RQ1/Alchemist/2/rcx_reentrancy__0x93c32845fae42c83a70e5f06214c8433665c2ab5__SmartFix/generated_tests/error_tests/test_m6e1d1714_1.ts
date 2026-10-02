import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant detection - m6e1d1714", function () {
  it("should detect mutant that logs msg.value-1 instead of msg.value", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy Log contract first
    const LogFactory = await ethers.getContractFactory("Log");
    const logContract = await LogFactory.deploy();
    await logContract.waitForDeployment();
    
    // Deploy X_WALLET with Log address as constructor argument
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await logContract.getAddress());
    await instance.waitForDeployment();
    
    // Call Put with exactly 2 ether
    const depositAmount = ethers.parseEther("2");
    const tx = await instance.connect(owner).Put(0, { value: depositAmount });
    await tx.wait();
    
    // Get the Log contract's history to verify the logged value
    const historyLength = await logContract.History.length;
    expect(historyLength).to.be.gt(0);
    
    const lastMessage = await logContract.History(historyLength - 1n);
    const loggedValue = lastMessage.Val;
    
    // The original should log msg.value (2 ether), mutant logs msg.value-1
    expect(loggedValue).to.equal(depositAmount);
  });
});