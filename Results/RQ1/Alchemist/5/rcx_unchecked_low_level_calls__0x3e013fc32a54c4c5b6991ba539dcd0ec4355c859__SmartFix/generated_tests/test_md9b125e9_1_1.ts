import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant detection", function () {
  it("should detect mutant md9b125e9 by sending less than contract balance and verifying balance unchanged", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with 2 ETH
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("2.0")
    });

    // Get initial contract balance
    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());

    // Try to call multiplicate with 1 ETH (less than current balance of 2 ETH)
    // Original would require msg.value >= address(this).balance which is false -> no transfer
    // Mutant with 'true' would transfer entire balance regardless
    await instance.connect(addr1).multiplicate(addr2.address, { value: ethers.parseEther("1.0") });

    // Get final contract balance
    const finalBalance = await ethers.provider.getBalance(await instance.getAddress());

    // Original behavior: balance unchanged (condition false)
    // Mutant behavior: balance would be 0 (all transferred)
    expect(finalBalance).to.equal(initialBalance);
  });
});