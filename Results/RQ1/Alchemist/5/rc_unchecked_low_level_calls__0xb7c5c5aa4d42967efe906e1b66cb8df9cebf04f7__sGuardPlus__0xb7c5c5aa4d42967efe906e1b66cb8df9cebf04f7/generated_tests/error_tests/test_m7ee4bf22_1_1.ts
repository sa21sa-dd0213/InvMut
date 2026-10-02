import { expect } from "chai";
import { ethers } from "hardhat";

describe("keepMyEther mutant m7ee4bf22", function () {
  it("should detect mutant that subtracts 1 wei from msg.value in fallback", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("keepMyEther");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 1 wei to the contract via fallback
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("0.000000000000000001") // 1 wei
    });
    await tx.wait();

    // Check balance recorded in the contract
    const balanceBefore = await instance.balances(addr1.address);

    // Withdraw all funds
    const withdrawTx = await instance.connect(addr1).withdraw();
    await withdrawTx.wait();

    // Check balance after withdrawal
    const balanceAfter = await instance.balances(addr1.address);

    // In original: 1 wei deposited, then withdrawn -> balance becomes 0
    // In mutant: 1 wei - 1 = 0 deposited -> withdraw sends 0 wei, balance stays 0
    // The mutant fails because the caller receives 0 wei instead of 1 wei
    expect(balanceBefore).to.equal(ethers.parseEther("0.000000000000000001"));
    expect(balanceAfter).to.equal(0);
  });
});