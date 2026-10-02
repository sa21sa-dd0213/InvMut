import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant ma07826ef test", function () {
  it("should detect the block.prevrandao substitution in Put()", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for X_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy X_WALLET with Log address
    const XWalletFactory = await ethers.getContractFactory("X_WALLET");
    const xwallet = await XWalletFactory.deploy(await logInstance.getAddress());
    await xwallet.waitForDeployment();

    // Set MinSum to 0 for testing (optional, but keep as is)
    // Default MinSum is 1 ether, so we need to deposit at least 1 ether
    const depositAmount = ethers.parseEther("1");

    // Call Put with _unlockTime = 0 (past timestamp)
    // In original: unlockTime becomes block.timestamp (current time)
    // In mutant: unlockTime becomes block.prevrandao (unpredictable, likely future)
    const putTx = await xwallet.connect(user).Put(0, { value: depositAmount });
    await putTx.wait();

    // Mine a new block to advance timestamp
    await ethers.provider.send("evm_mine", []);

    // Now block.timestamp > unlockTime (original)
    // For mutant, unlockTime = block.prevrandao (some large number), still > block.timestamp
    const collectAmount = ethers.parseEther("1");

    // This should succeed on original (timestamp advanced), fail on mutant
    const collectTx = xwallet.connect(user).Collect(collectAmount);

    // On the original contract, this would succeed
    // On the mutant, this should revert because block.prevrandao is much larger than block.timestamp
    await expect(collectTx).to.be.reverted;
  });
});