import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant m909e6616 - Put logs msg.value+1", function () {
  it("should kill the mutant by verifying the logged value equals msg.value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (needed as constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy W_WALLET with Log contract address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();
    
    const walletAddress = await instance.getAddress();
    const logAddress = await logInstance.getAddress();
    
    // Connect addr1 to the wallet contract
    const walletAsAddr1 = instance.connect(addr1);
    
    // Send 1 ether with unlockTime = current timestamp + 1000
    const sendAmount = ethers.parseEther("1");
    const currentTime = Math.floor(Date.now() / 1000);
    const unlockTime = currentTime + 1000;
    
    const tx = await walletAsAddr1.Put(unlockTime, { value: sendAmount });
    await tx.wait();
    
    // Get the Log contract instance connected to addr1
    const logAsAddr1 = logInstance.connect(addr1);
    
    // Read the last message from History array (index 0 since it's the first entry)
    const historyEntry = await logAsAddr1.History(0);
    
    // The logged Val should be exactly the sent amount (1 ether)
    // Mutant logs msg.value+1, so it would log 1 ether + 1 wei
    expect(historyEntry.Val).to.equal(sendAmount);
  });
});