import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant detection - m6e1d1714", function () {
  it("should detect mutant by verifying logged value matches sent Ether amount", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required by X_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy X_WALLET with Log address as constructor argument
    const WalletFactory = await ethers.getContractFactory("X_WALLET");
    const walletInstance = await WalletFactory.deploy(await logInstance.getAddress());
    await walletInstance.waitForDeployment();

    // Send exactly 1 wei to the Put function
    const oneWei = 1n;
    const tx = await walletInstance.connect(addr1).Put(0, { value: oneWei });
    await tx.wait();

    // Check the Log contract's History to see what was recorded
    // The last message in History should have Val = msg.value (1 wei)
    const historyLength = await logInstance["History(uint256)"](0); // Get length using array length function
    // Actually, let's use a different approach to get the length
    const historyCount = await logInstance["History(uint256)"](0); // This doesn't work for length
    
    // Correct way: use ethers to get array length
    const historyLengthBigInt = await ethers.provider.getStorage(
      await logInstance.getAddress(),
      0 // storage slot for dynamic array length
    );
    const historyLength = BigInt(historyLengthBigInt);
    
    const lastMessage = await logInstance["History(uint256)"](historyLength - 1n);

    // In the original contract, Val should equal 1 wei
    // In the mutant, Val would equal 0 (msg.value - 1)
    expect(lastMessage.Val).to.equal(oneWei);
  });
});