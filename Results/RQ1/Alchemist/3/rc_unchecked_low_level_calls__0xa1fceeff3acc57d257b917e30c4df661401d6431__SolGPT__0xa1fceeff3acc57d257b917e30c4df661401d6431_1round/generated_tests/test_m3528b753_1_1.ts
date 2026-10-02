import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant kill test - m3528b753", function () {
  it("should revert when transferFrom call fails (original) but mutant would not revert", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy AirDropContract
    const AirDropFactory = await ethers.getContractFactory("AirDropContract");
    const airDrop = await AirDropFactory.deploy();
    await airDrop.waitForDeployment();

    // Deploy a minimal contract that will fail on transferFrom call
    // This contract does not implement transferFrom, so the call will succeed at EVM level but return false
    const FailContractFactory = await ethers.getContractFactory(
      "contracts/FailContract.sol:FailContract"
    );
    const failContract = await FailContractFactory.deploy();
    await failContract.waitForDeployment();

    // Prepare arrays for the transfer call
    const tos = [addr1.address];
    const vs = [ethers.parseEther("1")];

    // In the original contract, this call would revert because the external call returns false
    // In the mutant, the require(_s) is removed, so it would return true instead of reverting
    await expect(
      airDrop.connect(owner).transfer(
        await failContract.getAddress(),
        tos,
        vs
      )
    ).to.be.reverted;

    // If we reach here, the test passes (original behavior) - but for mutant it would fail
    // because the mutant would not revert, thus killing the mutant
  });
});