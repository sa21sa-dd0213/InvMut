import { expect } from "chai";
import { ethers } } from "hardhat";

describe("W_WALLET mutant mefedbccc test", function () {
  it("should detect mutant where _s is replaced with true - balance deducted even on failed call", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy the Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy W_WALLET with the Log contract address
    const W_WALLETFactory = await ethers.getContractFactory("W_WALLET");
    const wallet = await W_WALLETFactory.deploy(await log.getAddress());
    await wallet.waitForDeployment();

    // Deploy a malicious contract that will reject Ether
    const RejectorFactory = await ethers.getContractFactory("contract Rejector { fallback() external payable { revert(); } }");
    const rejector = await RejectorFactory.deploy();
    await rejector.waitForDeployment();

    // User sends Ether to wallet via Put, setting unlockTime to now
    const putAmount = ethers.parseEther("2");
    const currentBlock = await ethers.provider.getBlock("latest");
    const unlockTime = currentBlock.timestamp + 100; // Set future unlock time

    await wallet.connect(user).Put(unlockTime, { value: putAmount });
    
    // Verify balance was recorded
    let holder = await wallet.Acc(user.address);
    expect(holder.balance).to.equal(putAmount);

    // Fast forward time past unlockTime
    await ethers.provider.send("evm_increaseTime", [200]);
    await ethers.provider.send("evm_mine");

    // Now user tries to Collect by sending to the rejector address
    // We need to use the rejector's address as the recipient via a call from user
    // But Collect sends to msg.sender, so we need to call from the rejector contract
    // Instead, let's make user call Collect with an amount that should be sent to them
    // To test the mutant, we need the low-level call to fail
    // We'll use a selfdestruct or other trick - simplest: call Collect from the rejector contract
    
    // Alternative approach: Have the rejector contract call Collect on wallet
    // But rejector has no balance - let's test differently:
    // The mutant will deduct balance even if the Ether transfer fails
    // Let's make the call fail by having the recipient be a contract without payable fallback
    
    // Actually, the simplest test: user calls Collect, and we make the EVM revert the call
    // by using a contract that reverts on receive
    
    // Let's deploy a contract that will receive the call and revert
    const ReverterFactory = await ethers.getContractFactory(
      "contract Reverter { receive() external payable { revert('revert'); } }"
    );
    const reverter = await ReverterFactory.deploy();
    await reverter.waitForDeployment();

    // We need user to call Collect but have the internal call go to reverter
    // This is tricky since Collect sends to msg.sender
    // Let's use a different approach: create a contract that acts as the user
    
    // Deploy a proxy contract that will receive the funds and revert
    const ProxyFactory = await ethers.getContractFactory(
      "contract Proxy { function attack(address wallet, uint amount) external { W_WALLET(wallet).Collect(amount); } fallback() external payable { revert(); } }"
    );
    const proxy = await ProxyFactory.deploy();
    await proxy.waitForDeployment();

    // Fund the proxy so it can call Put
    await owner.sendTransaction({ to: proxy.getAddress(), value: putAmount });
    
    // Proxy puts money into wallet
    await proxy.connect(owner).Put(unlockTime, { value: putAmount });
    
    // Fast forward time
    await ethers.provider.send("evm_increaseTime", [200]);
    await ethers.provider.send("evm_mine");

    // Proxy calls Collect - the call will fail because proxy's fallback reverts
    // In original: balance NOT deducted because _s is false
    // In mutant: balance IS deducted because _s replaced with true
    
    const collectAmount = ethers.parseEther("1");
    await proxy.connect(owner).attack(wallet.getAddress(), collectAmount);

    // Check balance after failed Collect attempt
    holder = await wallet.Acc(proxy.getAddress());
    
    // In original contract, balance would still be putAmount (1 ETH not deducted)
    // In mutant, balance would be putAmount - collectAmount (deducted even though transfer failed)
    // Therefore, if balance is less than putAmount, the mutant is detected
    expect(holder.balance).to.equal(putAmount); // This will fail on mutant, detecting it
  });
});