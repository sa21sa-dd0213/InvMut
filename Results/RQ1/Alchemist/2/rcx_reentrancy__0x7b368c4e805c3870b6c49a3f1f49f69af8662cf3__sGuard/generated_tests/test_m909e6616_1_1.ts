import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant detection - m909e6616", function () {
  it("should detect mutant that logs msg.value+1 instead of msg.value in Put", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (needed as constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy W_WALLET with Log contract address
    const WalletFactory = await ethers.getContractFactory("W_WALLET");
    const walletInstance = await WalletFactory.deploy(await logInstance.getAddress());
    await walletInstance.waitForDeployment();

    // Send a specific amount of Ether via Put
    const sendAmount = ethers.parseEther("1.5");
    const tx = await walletInstance.connect(addr1).Put(0, { value: sendAmount });
    await tx.wait();

    // Get the last message from Log contract's History array
    const historyLength = await logInstance.History.length();
    const lastMessage = await logInstance.History(historyLength - 1n);

    // Verify the logged Val equals exactly the amount sent (msg.value)
    // Original logs msg.value, mutant logs msg.value+1
    expect(lastMessage.Val).to.equal(sendAmount);
  });
});