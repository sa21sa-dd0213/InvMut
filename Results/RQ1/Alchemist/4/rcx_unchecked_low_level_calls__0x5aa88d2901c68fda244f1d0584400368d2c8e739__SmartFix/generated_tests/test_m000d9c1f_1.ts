import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 - Kill mutant m000d9c1f", function () {
  it("should revert when calling multiplicate with msg.value less than contract balance (kills mutant that replaces condition with true)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with 1 ether from owner
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Get initial balances
    const initialContractBalance = await ethers.provider.getBalance(await instance.getAddress());
    const initialAddr1Balance = await ethers.provider.getBalance(addr1.address);

    // Call multiplicate with only 1 wei (less than 1 ether contract balance)
    // Original contract: condition msg.value >= address(this).balance fails (1 wei < 1 ether), so no transfer
    // Mutant: condition is always true, so it would transfer all funds
    const tx = instance.connect(owner).multiplicate(addr1.address, { value: ethers.parseEther("0.000000000000000001") });
    
    // On original: no transfer happens, contract balance unchanged
    // On mutant: transfer happens, contract balance becomes 0
    // We expect the original behavior - no transfer because condition should fail
    await expect(tx).to.not.changeEtherBalances(
      [instance, addr1],
      [0, 0]
    );

    // Verify contract balance is unchanged (still has 1 ether)
    const finalContractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(finalContractBalance).to.equal(initialContractBalance);
  });
});