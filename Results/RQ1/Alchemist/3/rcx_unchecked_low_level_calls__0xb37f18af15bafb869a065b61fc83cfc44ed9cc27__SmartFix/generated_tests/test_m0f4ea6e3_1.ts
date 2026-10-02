import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m0f4ea6e3 by sending ether and checking depositsCount increments", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initial depositsCount should be 0
    expect(await instance.depositsCount()).to.equal(0);

    // Send 1 ether to the contract via receive() function
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });
    await tx.wait();

    // After successful deposit, depositsCount should be 1
    // Mutant will revert on the require check, so this assertion fails for mutant
    expect(await instance.depositsCount()).to.equal(1);
  });
});