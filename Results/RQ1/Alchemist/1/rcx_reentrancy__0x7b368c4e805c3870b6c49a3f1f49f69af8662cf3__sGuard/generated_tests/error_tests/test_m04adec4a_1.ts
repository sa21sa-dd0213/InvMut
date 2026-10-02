import { expect } from "chai";
import { ethers } } from "hardhat";

describe("W_WALLET mutant test for m04adec4a", function () {
  it("should detect mutant that logs msg.value-1 instead of msg.value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Log contract first (needed as constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy W_WALLET with the Log contract address
    const W_WALLETFactory = await ethers.getContractFactory("W_WALLET");
    const walletInstance = await W_WALLETFactory.deploy(await logInstance.getAddress());
    await walletInstance.waitForDeployment();
    
    // Send exactly 1 wei to the Put function via addr1
    const tx = await walletInstance.connect(addr1).Put(0, { value: ethers.parseEther("1") });
    await tx.wait();
    
    // Get the Log contract instance to check history
    const LogContract = await ethers.getContractAt("Log", await logInstance.getAddress());
    
    // The last message should have Val = 1 ether (the actual amount sent)
    // Mutant would log 1 ether - 1 wei, which is wrong
    const lastMessage = await LogContract.History(0);
    const loggedVal = lastMessage.Val;
    
    // Original contract logs msg.value = 1 ether
    // Mutant logs msg.value - 1 = 1 ether - 1 wei
    expect(loggedVal).to.equal(ethers.parseEther("1"));
  });
});