import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant madf1c5c2 by calling multiplicate with msg.value = 0 when contract has balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the contract with some ether so it has a non-zero balance
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    
    // Verify contract has balance
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalance).to.equal(ethers.parseEther("1.0"));
    
    // Call multiplicate with msg.value = 0 - should pass on original but fail on mutant
    // because original require: balance + 0 >= balance (true)
    // mutant require: balance * 0 >= balance (0 >= 1 ether) -> false -> revert
    await expect(
      instance.connect(addr1).multiplicate(addr1.address, { value: 0 })
    ).to.be.reverted;
  });
});