import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET - kill mutant md8e8d016", function () {
  it("should revert when withdrawing exactly the deposited amount due to balance inflation", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (needed as constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy W_WALLET with Log address
    const WalletFactory = await ethers.getContractFactory("W_WALLET");
    const wallet = await WalletFactory.deploy(await log.getAddress());
    await wallet.waitForDeployment();
    
    const depositAmount = ethers.parseEther("1.0");
    
    // User deposits exactly 1 ether via Put (which triggers fallback or direct call)
    await user.sendTransaction({
      to: await wallet.getAddress(),
      value: depositAmount
    });
    
    // User attempts to withdraw exactly 1 ether
    // In original contract: balance = 1 ether, withdrawal of 1 ether should succeed
    // In mutant: balance = 1 ether + 1 wei, so withdrawal of 1 ether succeeds, 
    // but then the remaining balance is 1 wei, making subsequent assertions fail
    const tx = await wallet.connect(user).Collect(depositAmount);
    await tx.wait();
    
    // After withdrawal, check the user's balance - in the mutant, 
    // there should be 1 wei remaining (the inflated amount)
    const holder = await wallet.Acc(user.address);
    
    // In original: balance should be 0 after withdrawing exactly the deposit
    // In mutant: balance should be 1 wei (the extra wei from msg.value+1)
    // This assertion will fail on the mutant, killing it
    expect(holder.balance).to.equal(0);
  });
});