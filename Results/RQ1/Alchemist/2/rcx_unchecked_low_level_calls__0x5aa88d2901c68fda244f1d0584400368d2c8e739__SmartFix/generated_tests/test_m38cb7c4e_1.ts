import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant kill test", function () {
  it("should kill mutant m38cb7c4e by calling multiplicate with msg.value=0 when contract has balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether so it has a non-zero balance
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Verify contract has balance
    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalanceBefore).to.equal(ethers.parseEther("1.0"));

    // Call multiplicate with msg.value = 0 and any address
    // In original: require((balance + 0) >= balance) passes
    // In mutant: require((balance * 0) >= balance) => require(0 >= balance) fails for positive balance
    const addr1BalanceBefore = await ethers.provider.getBalance(addr1.address);
    
    // This should succeed on original but revert on mutant
    const tx = instance.connect(owner).multiplicate(addr1.address, { value: 0 });
    await expect(tx).to.be.reverted;

    // Verify no transfer happened (mutant killed - revert prevented execution)
    const addr1BalanceAfter = await ethers.provider.getBalance(addr1.address);
    expect(addr1BalanceAfter).to.equal(addr1BalanceBefore);
  });
});