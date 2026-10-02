import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant kill test", function () {
  it("should kill mutant mac3bc81d by proving withdrawal logic is broken", async function () {
    const [owner, depositor] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed for this contract)
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit 1 ether from depositor address
    const depositAmount = ethers.parseEther("1.0");
    await instance.connect(depositor).deposit({ value: depositAmount });

    // Record contract balance before withdrawal
    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());

    // Attempt withdrawal
    const tx = await instance.connect(depositor).withdrawAll();
    await tx.wait();

    // Check contract balance after withdrawal - in mutant it should remain unchanged
    const contractBalanceAfter = await ethers.provider.getBalance(await instance.getAddress());

    // In original contract, the balance would decrease by 1 ETH
    // In mutant, the balance stays the same because the if(false) prevents execution
    expect(contractBalanceAfter).to.equal(contractBalanceBefore);

    // Also verify depositor's credit was NOT reset in mutant (still shows 1 ETH)
    // This further confirms the withdrawal logic was skipped
    const credit = await instance.credit(depositor.address);
    expect(credit).to.equal(depositAmount);
  });
});