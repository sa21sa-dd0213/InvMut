import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler delegateVoting mutation test", function () {
    it("should revert when a user with address greater than owner calls delegateVoting", async function () {
        const [owner, addr1, addr2] = await ethers.getSigners();
        
        // Deploy Cooler implementation and factory
        const Cooler = await ethers.getContractFactory("Cooler");
        const coolerImpl = await Cooler.deploy();
        await coolerImpl.waitForDeployment();

        const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
        const factory = await CoolerFactory.deploy();
        await factory.waitForDeployment();

        // Get a mock ERC20 token for collateral (needed for cooler generation)
        const ERC20Mock = await ethers.getContractFactory("ERC20");
        const collateral = await ERC20Mock.deploy("Collateral", "COL", 18);
        await collateral.waitForDeployment();

        // Generate a cooler for owner
        await factory.connect(owner).generateCooler(await collateral.getAddress(), await collateral.getAddress());

        // Get the cooler address for owner
        const coolerAddress = await factory.coolersFor(await collateral.getAddress(), await collateral.getAddress(), 0);
        const cooler = await ethers.getContractAt("Cooler", coolerAddress);

        // Find a user whose address is numerically greater than owner's address
        let attacker = addr1;
        if (attacker.address.toLowerCase() <= owner.address.toLowerCase()) {
            attacker = addr2;
        }

        // Attempt to call delegateVoting from the attacker - should revert in original
        await expect(
            cooler.connect(attacker).delegateVoting(attacker.address)
        ).to.be.revertedWithCustomError(cooler, "OnlyApproved");
    });
});