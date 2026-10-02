import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant detection - me60c0f74", function () {
  it("should detect the mutant by sending exactly the contract balance and expecting transfer", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed for this contract)
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // Fund the contract with some initial balance
    const initialFunding = ethers.parseEther("10");
    await owner.sendTransaction({
      to: instanceAddress,
      value: initialFunding
    });

    // Verify initial contract balance
    const contractBalanceBefore = await ethers.provider.getBalance(instanceAddress);
    expect(contractBalanceBefore).to.equal(initialFunding);

    // Record addr1's balance before
    const addr1BalanceBefore = await ethers.provider.getBalance(addr1.address);

    // Call multiplicate sending exactly the contract's current balance
    // Original: msg.value >= contract balance => enters if-block and transfers
    // Mutant: msg.value - 1 >= contract balance => fails because balance-1 < balance
    const tx = await instance.connect(owner).multiplicate(addr1.address, {
      value: contractBalanceBefore
    });
    await tx.wait();

    // Check that the transfer actually happened (will fail on mutant)
    const addr1BalanceAfter = await ethers.provider.getBalance(addr1.address);
    expect(addr1BalanceAfter).to.equal(addr1BalanceBefore + contractBalanceBefore);
  });
});