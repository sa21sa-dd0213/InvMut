import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant m04adec4a - detect msg.value-1 logging", function () {
  it("should detect mutant by verifying logged value equals actual sent amount", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logContract = await LogFactory.deploy();
    await logContract.waitForDeployment();
    
    // Deploy W_WALLET with Log contract address
    const WalletFactory = await ethers.getContractFactory("W_WALLET");
    const wallet = await WalletFactory.deploy(await logContract.getAddress());
    await wallet.waitForDeployment();
    
    const walletAddress = await wallet.getAddress();
    const logAddress = await logContract.getAddress();
    
    // Send exactly 2 ether to Put function
    const sentAmount = ethers.parseEther("2");
    const tx = await wallet.connect(user).Put(0, { value: sentAmount });
    await tx.wait();
    
    // Get the last message from Log contract's History
    const historyLength = await logContract.connect(owner).History.length;
    const lastMessage = await logContract.connect(owner).History(historyLength - 1n);
    
    // The logged Val should equal the exact amount sent (2 ether)
    // Mutant logs msg.value-1, so it would log 2 ether - 1 wei
    expect(lastMessage.Val).to.equal(sentAmount);
  });
});