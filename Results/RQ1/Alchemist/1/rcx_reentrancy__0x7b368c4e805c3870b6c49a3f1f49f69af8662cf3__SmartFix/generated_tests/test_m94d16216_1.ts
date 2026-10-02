import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant m94d16216 test", function () {
  it("should detect mutant that logs msg.value+1 instead of msg.value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required by W_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy W_WALLET with Log contract address
    const WalletFactory = await ethers.getContractFactory("W_WALLET");
    const walletInstance = await WalletFactory.deploy(await logInstance.getAddress());
    await walletInstance.waitForDeployment();
    
    // Send exactly 1 ether to Put function
    const sendAmount = ethers.parseEther("1");
    const tx = await walletInstance.connect(addr1).Put(0, { value: sendAmount });
    await tx.wait();
    
    // Read the logged value from the Log contract
    // History[0] contains the last message (since we only did one Put)
    const loggedMessage = await logInstance.History(0);
    const loggedVal = loggedMessage[2]; // Val is the third field in Message struct
    
    // Assert that the logged value equals the actual msg.value sent (not msg.value+1)
    expect(loggedVal).to.equal(sendAmount);
  });
});