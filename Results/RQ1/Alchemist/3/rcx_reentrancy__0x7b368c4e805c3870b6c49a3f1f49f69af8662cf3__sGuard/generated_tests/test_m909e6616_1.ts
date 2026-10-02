import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant kill test - m909e6616", function () {
  it("should detect mutant that logs msg.value+1 instead of msg.value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy W_WALLET with Log contract address
    const WalletFactory = await ethers.getContractFactory("W_WALLET");
    const walletInstance = await WalletFactory.deploy(await logInstance.getAddress());
    await walletInstance.waitForDeployment();
    
    const walletAddress = await walletInstance.getAddress();
    const logAddress = await logInstance.getAddress();
    
    // Get a reference to the Log contract from the deployed address
    const LogContract = await ethers.getContractAt("Log", logAddress);
    
    // Send exactly 1 ether to the Put function via addr1
    const putAmount = ethers.parseEther("1");
    const tx = await walletInstance.connect(addr1).Put(0, { value: putAmount });
    await tx.wait();
    
    // Retrieve the last message from the Log contract's History array
    const historyLength = await LogContract.History.length;
    const lastMessage = await LogContract.History(historyLength - 1n);
    
    // The logged Val should equal the actual amount sent (1 ether)
    // In the mutant, it would be 1 ether + 1 wei, causing the test to fail
    expect(lastMessage.Val).to.equal(putAmount);
  });
});