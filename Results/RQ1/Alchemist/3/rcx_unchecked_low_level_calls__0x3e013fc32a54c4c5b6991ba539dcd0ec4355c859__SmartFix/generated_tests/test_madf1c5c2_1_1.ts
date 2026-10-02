import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant detection - madf1c5c2", function () {
  it("should kill mutant by sending 0 value when contract has balance, causing multiplication to revert", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether so balance > 0
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });
    await fundTx.wait();

    // Verify contract has balance
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalance).to.equal(ethers.parseEther("1"));

    // Now call multiplicate with msg.value = 0
    // Original: require(balance + 0 >= balance) passes
    // Mutant: require(balance * 0 >= balance) reverts because 0 >= balance is false
    await expect(
      instance.connect(addr1).multiplicate(addr1.address, { value: 0 })
    ).to.be.reverted;
  });
});