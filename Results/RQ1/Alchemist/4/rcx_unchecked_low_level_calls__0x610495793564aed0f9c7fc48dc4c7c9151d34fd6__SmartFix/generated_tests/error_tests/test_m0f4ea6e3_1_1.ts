import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m0f4ea6e3: require((depositsCount + 1) >= depositsCount) replaced with <=", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initially depositsCount should be 0
    expect(await instance.depositsCount()).to.equal(0);

    // Send 1 ether to trigger receive() - should succeed in original, revert in mutant
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await tx.wait();

    // After successful deposit, depositsCount should be 1
    // On the mutant, the require condition (depositsCount + 1) <= depositsCount fails,
    // causing revert, so this assertion will fail -> killing the mutant
    expect(await instance.depositsCount()).to.equal(1);
  });
});