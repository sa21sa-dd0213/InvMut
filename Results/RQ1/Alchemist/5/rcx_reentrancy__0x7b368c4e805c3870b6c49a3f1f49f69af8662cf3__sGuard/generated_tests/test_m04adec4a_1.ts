import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant kill test - m04adec4a", function () {
  it("should kill mutant by verifying logged value equals sent msg.value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy W_WALLET with Log contract address
    const W_WALLETFactory = await ethers.getContractFactory("W_WALLET");
    const walletInstance = await W_WALLETFactory.deploy(await logInstance.getAddress());
    await walletInstance.waitForDeployment();
    
    // Send exactly 2 ether to Put function via addr1
    const sendAmount = ethers.parseEther("2");
    const unlockTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    
    const tx = await walletInstance.connect(addr1).Put(unlockTime, { value: sendAmount });
    await tx.wait();
    
    // Query the Log contract's History array to get the last logged message
    const historyLength = await logInstance.History.length;
    const lastMessage = await logInstance.History(historyLength - 1n);
    
    // Assert that the logged Val equals the sent msg.value (2 ether)
    // Mutant logs msg.value - 1, which would be 2 ether - 1 wei, causing this assertion to fail
    expect(lastMessage.Val).to.equal(sendAmount);
  });
});