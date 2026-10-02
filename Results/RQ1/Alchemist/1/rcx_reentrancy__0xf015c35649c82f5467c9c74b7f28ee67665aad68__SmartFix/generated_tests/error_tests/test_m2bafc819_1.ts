import { expect } from "chai";
import { ethers } } from "hardhat";

describe("MY_BANK mutant detection - m2bafc819", function () {
  it("should revert Collect when external call fails, preventing balance deduction and event emission", async function () {
    const [owner, attacker, recipient] = await ethers.getSigners();

    // Deploy Log contract first
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    // Deploy a contract that rejects Ether
    const RejectorFactory = await ethers.getContractFactory("RejectEther");
    const rejector = await RejectorFactory.deploy();
    await rejector.waitForDeployment();

    // Fund the bank from attacker (needs to put ether first)
    const putAmount = ethers.parseEther("10");
    await bank.connect(attacker).Put(0, { value: putAmount });

    // Fund the rejector contract so it can receive the call (but will revert)
    await owner.sendTransaction({
      to: await rejector.getAddress(),
      value: ethers.parseEther("1")
    });

    // Now try to collect from attacker's account, sending to rejector (which will fail)
    // We need to make attacker the caller but the recipient will be rejector
    // Since MY_BANK sends to msg.sender, we must call from rejector contract
    // But rejector cannot call - so we use a different approach: 
    // Call Collect from a contract that will receive the ether and revert
    const collectAmount = ethers.parseEther("1");
    
    // First, fund the bank from the rejector contract address
    await bank.connect(rejector).Put(0, { value: putAmount });

    // Now try Collect from rejector - it will try to send ether to rejector which reverts
    await expect(
      bank.connect(rejector).Collect(collectAmount)
    ).to.be.reverted;

    // Verify balance was NOT deducted from rejector's account
    const holderInfo = await bank.Acc(await rejector.getAddress());
    expect(holderInfo.balance).to.equal(putAmount);
  });
});

// Helper contract that reverts on receive
contract RejectEther {
  receive() external payable {
    revert("I reject your ether");
  }
}