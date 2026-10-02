import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant test - m3528b753", function () {
  it("should revert when external call fails in original, but mutant would not revert", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the AirDropContract
    const AirDropFactory = await ethers.getContractFactory("AirDropContract");
    const airDrop = await AirDropFactory.deploy();
    await airDrop.waitForDeployment();
    
    // Deploy a simple contract that will revert on transferFrom call
    const revertContractFactory = await ethers.getContractFactory(
      "contract RevertOnTransfer { function transferFrom(address, address, uint256) external pure returns (bool) { revert('always revert'); } }"
    );
    const revertContract = await revertContractFactory.deploy();
    await revertContract.waitForDeployment();
    
    // Prepare arrays for the transfer call
    const tos = [addr1.address];
    const vs = [ethers.parseEther("1")];
    
    // This should revert because the external call to revertContract will fail
    // The original contract has require(_s) which catches this
    // The mutant removes require(_s) so it would not revert
    await expect(
      airDrop.connect(owner).transfer(await revertContract.getAddress(), tos, vs)
    ).to.be.reverted;
  });
});