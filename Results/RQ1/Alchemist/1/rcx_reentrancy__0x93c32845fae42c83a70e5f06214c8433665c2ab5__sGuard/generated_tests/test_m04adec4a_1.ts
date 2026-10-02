import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant m04adec4a test", function () {
  it("should detect mutant that logs msg.value-1 instead of msg.value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy X_WALLET with Log address as constructor argument
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();
    
    // Send 2 ether to Put function via addr1
    const sendAmount = ethers.parseEther("2");
    const tx = await instance.connect(addr1).Put(0, { value: sendAmount });
    await tx.wait();
    
    // Query the Log contract's History array to get the logged value
    // The first message in History should correspond to this transaction
    const historyEntry = await logInstance.History(0);
    const loggedVal = historyEntry.Val;
    
    // Assert that the logged value equals the actual msg.value sent
    // The mutant would log msg.value-1, so this assertion should fail on mutant
    expect(loggedVal).to.equal(sendAmount);
  });
});