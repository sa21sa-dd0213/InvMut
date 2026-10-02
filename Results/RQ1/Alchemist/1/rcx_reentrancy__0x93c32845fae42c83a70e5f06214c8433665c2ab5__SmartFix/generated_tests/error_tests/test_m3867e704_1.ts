import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant m3867e704 test", function () {
  it("should detect mutant by testing Collect reverts when recipient contract rejects Ether", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument for X_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy X_WALLET with Log address
    const WalletFactory = await ethers.getContractFactory("X_WALLET");
    const wallet = await WalletFactory.deploy(await log.getAddress());
    await wallet.waitForDeployment();
    
    // Deploy a malicious recipient contract that always reverts on receive
    const RejectorFactory = await ethers.getContractFactory("contract Rejector { receive() external payable { revert(); } }");
    const rejector = await RejectorFactory.deploy();
    await rejector.waitForDeployment();
    const rejectorAddress = await rejector.getAddress();
    
    // Fund the wallet from addr1 with 2 ether and set unlock time to now
    const depositAmount = ethers.parseEther("2");
    const currentTime = Math.floor(Date.now() / 1000);
    await wallet.connect(addr1).Put(currentTime, { value: depositAmount });
    
    // Verify balance was deposited
    let holder = await wallet.Acc(addr1.address);
    expect(holder.balance).to.equal(depositAmount);
    
    // Set MinSum to 1 ether (default) and try to collect 1 ether from addr1
    const collectAmount = ethers.parseEther("1");
    
    // In the original contract, this should revert because rejector rejects Ether
    // In the mutant, it would silently succeed (no revert) - incorrect behavior
    await expect(
      wallet.connect(addr1).Collect(collectAmount)
    ).to.be.reverted;
    
    // Verify state is unchanged (balance still full amount)
    holder = await wallet.Acc(addr1.address);
    expect(holder.balance).to.equal(depositAmount);
  });
});