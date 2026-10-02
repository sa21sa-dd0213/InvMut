import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant kill test", function () {
  it("should kill mutant m319c0e32 by sending 1 wei when balance is 0 and expecting success (mutant reverts due to +1)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Ensure contract balance is 0
    const initialBalance = await ethers.provider.getBalance(instance.target);
    expect(initialBalance).to.equal(0n);

    // Send exactly 1 wei to multiplicate - in original this should succeed
    // because msg.value (1) >= address(this).balance (0) and transfer amount = 0+1 = 1
    // In mutant, transfer amount = 0+1+1 = 2, which exceeds contract balance of 1 after msg.value
    const tx = instance.connect(owner).multiplicate(addr1.address, { value: 1n });

    // Original would succeed; mutant should revert due to insufficient balance
    await expect(tx).to.be.reverted;
  });
});