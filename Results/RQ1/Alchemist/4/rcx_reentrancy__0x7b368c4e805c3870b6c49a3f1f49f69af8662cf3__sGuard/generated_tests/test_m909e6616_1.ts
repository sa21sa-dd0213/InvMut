import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant m909e6616 detection", function () {
  it("should detect mutant that logs msg.value+1 instead of msg.value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy W_WALLET with Log contract address as constructor argument
    const W_WALLETFactory = await ethers.getContractFactory("W_WALLET");
    const walletInstance = await W_WALLETFactory.deploy(await logInstance.getAddress());
    await walletInstance.waitForDeployment();
    
    const putAmount = ethers.parseEther("1.0");
    
    // Call Put with exactly 1 ether
    const tx = await walletInstance.connect(addr1).Put(0, { value: putAmount });
    await tx.wait();
    
    // Get the last logged message from the Log contract
    // History is a public array, so we can access the last element
    const historyLength = await logInstance.History.length;
    const lastMessage = await logInstance.History(historyLength - BigInt(1));
    
    // The logged Val should equal the exact msg.value sent (1 ether)
    // Mutant logs msg.value+1, so it would log 1 ether + 1 wei
    expect(lastMessage.Val).to.equal(putAmount);
  });
});