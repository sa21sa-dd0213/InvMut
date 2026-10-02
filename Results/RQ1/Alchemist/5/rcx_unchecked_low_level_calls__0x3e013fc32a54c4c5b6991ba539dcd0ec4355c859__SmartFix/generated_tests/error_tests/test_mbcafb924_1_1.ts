import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 - kill mutant mbcafb924", function () {
  it("should revert when sending max uint256 value to multiplicate (kills mutant with msg.value+1 overflow)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether so balance > 0
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attempt to call multiplicate with the maximum uint256 value
    const maxUint = ethers.MaxUint256;

    await expect(
      instance.connect(owner).multiplicate(addr1.address, { value: maxUint })
    ).to.be.reverted;
  });
});