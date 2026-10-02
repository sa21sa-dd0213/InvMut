import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant m3867e704 test", function () {
  it("should detect removal of revert on failed Collect call", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("2");

    // Deploy a contract that rejects incoming Ether
    const RejectorFactory = await ethers.getContractFactory(
      "contract Rejector { receive() external payable { revert(); } fallback() external payable { revert(); } }"
    );
    const rejector = await RejectorFactory.deploy();
    await rejector.waitForDeployment();

    // Deploy a contract that calls Collect and reverts on receive
    const AttackerFactory = await ethers.getContractFactory(
      "contract Attacker { function attack(address target, uint amount) external { target.call(abi.encodeWithSignature(\"Collect(uint256)\", amount)); } receive() external payable { revert(); } }"
    );
    const attacker = await AttackerFactory.deploy();
    await attacker.waitForDeployment();

    // Fund attacker's account in W_WALLET
    await instance.connect(addr1).Put(0, { value: depositAmount });

    // Get attacker's balance before
    const attackerAccBefore = await instance.Acc(await attacker.getAddress());
    const attackerBalanceBefore = attackerAccBefore.balance;

    // Call Collect through the attacker (which will revert on receiving Ether)
    // The attacker contract calls Collect, which will try to send Ether to the attacker
    // Since the attacker rejects Ether, the transfer will fail
    try {
      await attacker.connect(addr1).attack(await instance.getAddress(), ethers.parseEther("1"));
    } catch (e) {
      // Expected revert, do nothing
    }

    // Check the balance after - in the mutant, the balance should have decreased
    // (because the revert was removed, so the subtraction happened even though transfer failed)
    const attackerAccAfter = await instance.Acc(await attacker.getAddress());
    const attackerBalanceAfter = attackerAccAfter.balance;

    // In the original contract, the balance should remain unchanged due to revert
    // In the mutant, the balance decreases even though the transfer failed
    expect(attackerBalanceAfter).to.be.lessThan(attackerBalanceBefore);
  });
});