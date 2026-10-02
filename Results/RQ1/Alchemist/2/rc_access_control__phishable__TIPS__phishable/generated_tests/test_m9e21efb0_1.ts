import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant m9e21efb0 test", function () {
  it("should kill mutant by verifying owner is set correctly after deployment", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Verify that owner was correctly set to the provided _owner address
    const contractOwner = await instance.owner();
    expect(contractOwner).to.equal(owner.address);

    // Verify that withdrawAll works when called by the actual owner
    // Send some ETH to the contract first
    await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Owner should be able to withdraw successfully
    await expect(instance.connect(owner).withdrawAll(owner.address)).to.not.be.reverted;
  });
});