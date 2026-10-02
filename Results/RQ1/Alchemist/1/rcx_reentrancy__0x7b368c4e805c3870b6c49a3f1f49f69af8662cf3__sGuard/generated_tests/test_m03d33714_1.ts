import { expect } from "chai";
import { ethers } } from "hardhat";

describe("W_WALLET mutant m03d33714 test", function () {
  it("should revert when collecting amount greater than balance on original, but succeed on mutant", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy the Log contract first (required by W_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy W_WALLET with Log contract address
    const WalletFactory = await ethers.getContractFactory("W_WALLET");
    const wallet = await WalletFactory.deploy(await log.getAddress());
    await wallet.waitForDeployment();
    
    const depositAmount = ethers.parseEther("2");
    const withdrawAmount = ethers.parseEther("5");
    
    // User deposits 2 ether
    await wallet.connect(user).Put(0, { value: depositAmount });
    
    // Verify balance is 2 ether
    const holder = await wallet.Acc(user.address);
    expect(holder.balance).to.equal(depositAmount);
    
    // Attempt to collect 5 ether (more than balance)
    // In original contract this would revert (balance >= _am check fails)
    // In mutant this succeeds (balance <= _am check passes)
    const tx = wallet.connect(user).Collect(withdrawAmount);
    
    // The mutant should NOT revert, while the original would
    // We expect this to succeed on the mutant (killing it)
    await expect(tx).to.not.be.reverted;
    
    // Verify the balance was incorrectly reduced (drained more than deposited)
    const holderAfter = await wallet.Acc(user.address);
    expect(holderAfter.balance).to.be.lessThan(depositAmount);
  });
});