import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-creator calls migrateTo (mutant removed access control)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether so migrateTo has balance to transfer
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Non-creator (addr1) should NOT be able to call migrateTo
    // The mutant removed the require(creator == msg.sender) check,
    // so this call would succeed on the mutant but should revert on the original
    await expect(
      instance.connect(addr1).migrateTo(addr2.address)
    ).to.be.reverted;
  });
});