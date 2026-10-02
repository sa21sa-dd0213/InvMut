import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant mebeafbbb by sending exactly contract balance and verifying balance becomes 0", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether (e.g., 2 ether)
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("2")
    });

    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());
    
    // Send exactly the contract's balance as msg.value to multiplicate
    // This should trigger the if condition and transfer everything
    await instance.connect(addr2).multiplicate(addr1.address, { value: initialBalance });

    // Check that the contract balance is now 0
    const finalBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(finalBalance).to.equal(0);
  });
});