import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant kill test for m0590d68f", function () {
  it("should detect the mutant by sending value equal to contract balance and checking multiplication behavior", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance
    const initialFunding = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: initialFunding
    });

    // Verify initial balance
    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalanceBefore).to.equal(initialFunding);

    // Send exactly the same amount as current contract balance
    const sendAmount = contractBalanceBefore;
    const addr1BalanceBefore = await ethers.provider.getBalance(addr1.address);

    // Call multiplicate with msg.value equal to contract balance
    await instance.connect(addr1).multiplicate(addr1.address, { value: sendAmount });

    const contractBalanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    const addr1BalanceAfter = await ethers.provider.getBalance(addr1.address);

    // In the original contract, the multiplication executes and transfers 2x balance to addr1
    // In the mutant, the condition msg.value > balance fails (equal case), so no transfer occurs
    // Original: addr1 gets 2 * initialFunding (contract becomes empty)
    // Mutant: addr1 gets nothing back (contract retains funds)
    
    // The test kills the mutant by checking that the contract balance becomes zero
    // (original behavior) - if mutant, contract balance will still be positive
    expect(contractBalanceAfter).to.equal(0);
    
    // Also verify addr1 received the expected amount
    const expectedTransfer = sendAmount + contractBalanceBefore; // 2 * initialFunding
    const expectedAddr1Balance = addr1BalanceBefore + expectedTransfer;
    expect(addr1BalanceAfter).to.equal(expectedAddr1Balance);
  });
});