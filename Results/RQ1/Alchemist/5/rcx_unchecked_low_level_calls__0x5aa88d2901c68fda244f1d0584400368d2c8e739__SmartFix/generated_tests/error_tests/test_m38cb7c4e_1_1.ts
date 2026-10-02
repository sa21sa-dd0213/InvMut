import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant kill test", function () {
  it("should kill mutant m38cb7c4e by calling multiplicate with msg.value=0 when contract has balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether so balance > 0
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Verify contract has balance
    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalanceBefore).to.equal(ethers.parseEther("1.0"));

    // Call multiplicate with msg.value = 0
    // Original: require(balance + 0 >= balance) passes
    // Mutant:   require(balance * 0 >= balance) reverts because 0 >= balance is false
    await expect(
      instance.connect(owner).multiplicate(addr1.address, { value: 0 })
    ).to.be.reverted;
  });
});