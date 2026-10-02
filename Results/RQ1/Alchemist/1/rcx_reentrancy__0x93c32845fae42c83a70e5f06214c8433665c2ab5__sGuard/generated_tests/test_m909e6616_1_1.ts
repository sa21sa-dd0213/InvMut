import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant m909e6616 test", function () {
  it("should kill mutant by verifying that logged value equals msg.value (not msg.value+1)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required by X_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy X_WALLET with Log contract address
    const WalletFactory = await ethers.getContractFactory("X_WALLET");
    const walletInstance = await WalletFactory.deploy(await logInstance.getAddress());
    await walletInstance.waitForDeployment();

    const sendAmount = ethers.parseEther("1.0");

    // Call Put with exactly 1 ether
    const tx = await walletInstance.connect(addr1).Put(
      Math.floor(Date.now() / 1000) + 3600, // unlock time 1 hour in future
      { value: sendAmount }
    );
    await tx.wait();

    // Get the logged message from Log contract
    const historyLength = await logInstance.History.length;
    const lastMessage = await logInstance.History(Number(historyLength) - 1);

    // Assert that the logged value equals the actual msg.value (1 ether)
    // The mutant logs msg.value+1, so this assertion will fail on mutant
    expect(lastMessage.Val).to.equal(sendAmount);
  });
});